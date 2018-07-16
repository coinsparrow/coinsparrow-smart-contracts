import
{
  increaseTimeTo,
  duration,
}
  from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';
import EVMInvalidAddress from './helpers/EVMInvalidAddress';

const BigNumber = web3.BigNumber;

const Hashids = require('hashids');
const hashids = new Hashids('some salting', 16);

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const CoinSparrow = artifacts.require('CoinSparrow');

contract('CoinSparrow', function ([_owner, _hirer, _contractor,
  _newArbitrator, _withdrawAccount, _,
]) {
  let jobNum = 1000000000;
  let _jobId = hashids.encode(jobNum);
  const _value = new web3.BigNumber(web3.toWei(0.2, 'ether'));
  const _fee = _value.mul(0.01);
  const _jobStartWindow = 600;
  const MAX_SEND = 3;

  beforeEach(async function () {
    this.startTime = latestTime();
    this.agreedSecondsToComplete = duration.days(1);
    this.coinSparrow = await CoinSparrow.new(new web3.BigNumber(
      web3.toWei(MAX_SEND, 'ether')),
    {
      from: _owner,
    });
    jobNum++;
    _jobId = hashids.encode(jobNum);
  });

  /*
   * Hirer Specific
   */
  describe('Hirer Only Specific Functionality', function () {
    it('Hirer should correctly create job escrow', async function () {
      await this.coinSparrow.createJobEscrow(
        _jobId, _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        }
      )
        .should.be.fulfilled;

      const amountInEscrow = await this.coinSparrow.howMuchInEscrow(
        {
          from: _owner,
        });

      amountInEscrow.should.be.bignumber.equal(_value);
    });

    it('Only Hirer can create Escrow', async function () {
      // msg.sender == _contractor
      await this.coinSparrow.createJobEscrow(
        _jobId, _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _contractor,
          value: _value,
        }
      )
        .should.be.rejectedWith(EVMRevert);

      // msg.sender == 0x0
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: 0x0,
          value: _value,
        })
        .should.be.rejectedWith(EVMInvalidAddress);

      // msg.sender == _owner
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _owner,
          value: _value,
        })
        .should.be.rejectedWith(EVMRevert);

      // OK
      console.log("this works: ", _jobId, "hirer: ",_hirer,"con: ", _contractor,"val: ", _value, "fee: ",_fee);

      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;
    });

    it('Only hirer can release funds', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        })
        .should.be.fulfilled;

      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;
      await this.coinSparrow.jobCompleted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.fulfilled;

      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _contractor,
        })
        .should.be.rejectedWith(EVMRevert);
      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _owner,
        })
        .should.be.rejectedWith(EVMRevert);
      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: 0x0,
        })
        .should.be.rejectedWith(EVMInvalidAddress);

      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.fulfilled;

    });
  });
});
