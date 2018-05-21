import
{
  increaseTimeTo,
  duration,
}
  from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const Web3Utils = require('web3-utils');

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
  const _fee = _value.mul(0.02);
  const _jobStartWindow = 600;
  const _contractorPercent = 40;
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
    //    _jobId = web3.fromAscii(hashids.encode(jobNum));
    _jobId = hashids.encode(jobNum);
    // console.log(_jobId);
  });

  /*
   * Complex Cancellation & Refunds
   */
  describe('Complex Cancellation & Refunds', function () {
    it('Check validateRefundSignature() - hirer, correct sig',
      async function () {
        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });
        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);

        const isValid = await this.coinSparrow.validateRefundSignature
          .call(_contractorPercent, _signatureHirer, _hirer);
        isValid.should.equal(true);
      });

    it(
      'Check validateRefundSignature() - hirer, incorrect sig',
      async function () {
        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });
        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);

        let isValid = await this.coinSparrow.validateRefundSignature
          .call(_contractorPercent, _signatureHirer,
            _contractor);
        isValid.should.equal(false);

        isValid = await this.coinSparrow.validateRefundSignature
          .call((_contractorPercent + 1), _signatureHirer,
            _hirer);
        isValid.should.equal(false);
      });

    it(
      'Check validateRefundSignature() - contractor, correct sig',
      async function () {
        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });
        const _signatureHirer = web3.eth.sign(_contractor,
          _sigMsg);

        const isValid = await this.coinSparrow.validateRefundSignature
          .call(_contractorPercent, _signatureHirer,
            _contractor);
        isValid.should.equal(true);
      });

    it(
      'Check validateRefundSignature() - contractor, incorrect sig',
      async function () {
        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });
        const _signatureHirer = web3.eth.sign(_contractor,
          _sigMsg);

        let isValid = await this.coinSparrow.validateRefundSignature
          .call(_contractorPercent, _signatureHirer, _hirer);
        isValid.should.equal(false);

        isValid = await this.coinSparrow.validateRefundSignature
          .call((_contractorPercent + 1), _signatureHirer,
            _contractor);
        isValid.should.equal(false);
      });

    it(
      'Hirer should be able to request cancellation after job starts',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;
      });

    it('Hirer cannot request cancellation before job starts',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.rejected;
      });

    it(
      'Hirer cannot request cancellation after job completed',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.jobCompleted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.rejected;
      });

    it(
      'Hirer and Contractor can mutually agree on refund - Hirer calling',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });

        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);
        const _signatureContractor = web3.eth.sign(
          _contractor, _sigMsg);

        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _hirer,
          })
          .should.be.fulfilled;
      });

    it(
      'Hirer and Contractor can mutually agree on refund - Contractor calling',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });

        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);
        const _signatureContractor = web3.eth.sign(
          _contractor, _sigMsg);

        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
      });

    it(
      'Address other than Hirer or Contractor cannot call mutuallyAgreedCancellation',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });

        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);
        const _signatureContractor = web3.eth.sign(
          _contractor, _sigMsg);

        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _owner,
          })
          .should.be.rejected;
        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: 0x0,
          })
          .should.be.rejected;
        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _newArbitrator,
          })
          .should.be.rejected;
      });

    it(
      'Must have valid signatures for mutual refund agreement',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        // different message to that expected in the Smart Contract
        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: (_contractorPercent + 5),
          });

        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);
        const _signatureContractor = web3.eth.sign(
          _contractor, _sigMsg);

        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _contractor,
          })
          .should.be.rejected;
        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _hirer,
          })
          .should.be.rejected;
      });

    it(
      'Both parties must sign agreement before refund can be issued',
      async function () {
        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });

        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);
        const _signatureContractor = web3.eth.sign(
          _contractor, _sigMsg);

        // only contractor signed
        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, '', _signatureContractor,
          {
            from: _contractor,
          })
          .should.be.rejected;
        // only hirer signed
        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer, '',
          {
            from: _hirer,
          })
          .should.be.rejected;
        // neither signed
        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, '', '',
          {
            from: _hirer,
          })
          .should.be.rejected;

        // OK
        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _contractor,
          })
          .should.be.fulfilled;
      });

    it('Refund % sent must match signed amount', async function () {
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        });
      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        });
      await this.coinSparrow.requestMutualCancelation(
        _jobId, _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        })
        .should.be.fulfilled;

      const _sigMsg = Web3Utils.soliditySha3(
        {
          type: 'uint8',
          value: _contractorPercent,
        });

      const _signatureHirer = web3.eth.sign(_hirer,
        _sigMsg);
      const _signatureContractor = web3.eth.sign(
        _contractor, _sigMsg);

      let adjustedPercent = _contractorPercent + 1;

      await this.coinSparrow.mutuallyAgreedCancellation(
        _jobId, _hirer, _contractor, _value, _fee,
        adjustedPercent, _signatureHirer,
        _signatureContractor,
        {
          from: _contractor,
        })
        .should.be.rejected;
      await this.coinSparrow.mutuallyAgreedCancellation(
        _jobId, _hirer, _contractor, _value, _fee,
        adjustedPercent, _signatureHirer,
        _signatureContractor,
        {
          from: _hirer,
        })
        .should.be.rejected;
    });

    it(
      'Hirer receives correct refund % from mutually agreed refund',
      async function () {
        let contractorAmount = _value.minus(_fee)
          .mul(_contractorPercent)
          .div(100);
        const hirerPre = web3.eth.getBalance(_hirer);
        const hirerPreForGasCalc = hirerPre.minus(
          contractorAmount);

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });

        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);
        const _signatureContractor = web3.eth.sign(
          _contractor, _sigMsg);

        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const hirerPost = web3.eth.getBalance(_hirer);

        const gasCost = hirerPreForGasCalc.minus(hirerPost.minus(
          contractorAmount));

        hirerPre.minus(gasCost)
          .should.be.bignumber.equal(hirerPost);
      });

    it(
      'Contractor receives correct refund % from mutually agreed refund',
      async function () {
        let hirerAmount = _value.minus(_fee)
          .mul(100 - _contractorPercent)
          .div(100);

        const contractorPre = web3.eth.getBalance(
          _contractor);
        const contractorPreForGasCalc = contractorPre.minus(
          hirerAmount);

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });

        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);
        const _signatureContractor = web3.eth.sign(
          _contractor, _sigMsg);

        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const contractorPost = web3.eth.getBalance(
          _contractor);

        const gasCost = contractorPreForGasCalc.minus(
          contractorPost.minus(hirerAmount));

        contractorPre.minus(gasCost)
          .should.be.bignumber.equal(contractorPost);
      });

    it(
      'CoinSparrow fees correctly calculated after mutually agreed refund',
      async function () {
        const feesPre = await this.coinSparrow.howManyFees(
          {
            from: _owner,
          });

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });
        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });
        await this.coinSparrow.requestMutualCancelation(
          _jobId, _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const _sigMsg = Web3Utils.soliditySha3(
          {
            type: 'uint8',
            value: _contractorPercent,
          });

        const _signatureHirer = web3.eth.sign(_hirer,
          _sigMsg);
        const _signatureContractor = web3.eth.sign(
          _contractor, _sigMsg);

        await this.coinSparrow.mutuallyAgreedCancellation(
          _jobId, _hirer, _contractor, _value, _fee,
          _contractorPercent, _signatureHirer,
          _signatureContractor,
          {
            from: _hirer,
          })
          .should.be.fulfilled;

        const feesPost = await this.coinSparrow.howManyFees(
          {
            from: _owner,
          });

        feesPost.minus(feesPre)
          .should.be.bignumber.equal(_fee);
      });
  });
});
